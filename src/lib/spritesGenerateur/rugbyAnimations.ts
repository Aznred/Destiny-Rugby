import { clone, createFrame, createRestPose } from './models'
import type { AnimationClip, BallAttachment, Character, ProjectData, SkeletonPose } from './models'
import { computeSkeleton, interpolatePose, mirrorPose } from './engine'

// Angles here are world-space limb directions: 0 points right, 90 down.
interface Stance {
  lean?: number; x?: number; y?: number; head?: number
  arms?: [number,number,number,number]; legs?: [number,number,number,number]
  ball?: BallAttachment; ballX?: number; ballY?: number; ballAngle?: number
  card?: 'yellow' | 'red'
}
const reference:Character={id:'reference',name:'Reference',position:'',appearance:{skin:'#eee',bodyType:'athletic',hair:{style:'short',color:'#111'},facialHair:{style:'none',color:'#111'},number:10,body:{height:1,torsoLength:1,torsoWidth:1,shoulderWidth:1,armLength:1,armThickness:1,legLength:1,legThickness:1,headScale:1},kit:{primary:'#fff',secondary:'#aaa',accent:'#fff',pattern:'SOLID',shorts:'#fff',socks:'#aaa',boots:'#111'}}}
function stance(s:Stance={}):SkeletonPose {
  const p=createRestPose(),lean=s.lean??0,a=s.arms??[108,-15,72,15],l=s.legs??[94,0,86,0]
  p.orientation='right';p.root.x=s.x??0;p.root.y=s.y??0;p.bones.torso.rotation=lean;p.bones.head.rotation=s.head??-lean*.35
  p.bones.leftUpperArm.rotation=a[0]-108-lean;p.bones.leftForearm.rotation=a[1]
  p.bones.rightUpperArm.rotation=a[2]-72-lean;p.bones.rightForearm.rotation=a[3]
  p.bones.leftThigh.rotation=l[0]-94;p.bones.leftShin.rotation=l[1]
  p.bones.rightThigh.rotation=l[2]-86;p.bones.rightShin.rotation=l[3]
  p.bones.leftFoot.rotation=-(l[0]+l[1]-72);p.bones.rightFoot.rotation=-(l[2]+l[3]-72)
  p.ball={attachment:s.ball??'HIDDEN',x:s.ballX??0,y:s.ballY??0,rotation:s.ballAngle??-20,scale:1}
  p.refereeCard=s.card
  return p
}
const carry=[65,-115,105,-110] as [number,number,number,number]
const ready=()=>stance({arms:carry,ball:'RIGHT_HAND'})
const crouch=()=>stance({lean:35,y:34,arms:[45,-70,65,-90],legs:[40,95,125,-70]})
const ground=()=>stance({lean:88,y:92,arms:[5,5,15,-10],legs:[170,-15,175,-25],ball:'RIGHT_HAND'})
function ballWorld(p:SkeletonPose){const j=computeSkeleton(reference,p).joints;const a=p.ball.attachment;const anchor=a==='LEFT_HAND'?j.leftHand:a==='RIGHT_HAND'?j.rightHand:a==='BOTH_HANDS'?{x:(j.leftHand.x+j.rightHand.x)/2,y:(j.leftHand.y+j.rightHand.y)/2}:{x:0,y:0};return {...p.ball,attachment:'FREE' as const,x:anchor.x+p.ball.x,y:anchor.y+p.ball.y}}
function blend(a:SkeletonPose,b:SkeletonPose,t:number){
  // Attachment changes must not interpolate offsets in incompatible coordinate spaces.
  if(a.ball.attachment!==b.ball.attachment&&a.ball.attachment!=='HIDDEN'&&b.ball.attachment!=='HIDDEN'){
    const from=clone(a),to=clone(b);from.ball=ballWorld(a);to.ball=ballWorld(b);return interpolatePose(from,to,t,true)
  }
  return interpolatePose(a,b,t,true)
}
function action(id:string,name:string,category:string,description:string,keys:SkeletonPose[],seconds=1.4,loop=false):AnimationClip {
  const fps=16,count=Math.max(16,Math.round(seconds*fps)),segments=loop?keys.length:keys.length-1
  const frames=Array.from({length:count},(_,i)=>{const position=i/(loop?count:count-1)*segments,index=Math.min(Math.floor(position),keys.length-1),next=loop?(index+1)%keys.length:Math.min(index+1,keys.length-1);return createFrame(blend(keys[index],keys[next],position-index),i)})
  return {id:`rugby_${id}`,name,category,description,fps,loop,rootMotion:true,interpolation:'LINEAR',frames}
}
function gait(id:string,name:string,amplitude:number,seconds:number,ball=false):AnimationClip {
  const frames=Array.from({length:24},(_,i)=>{const phase=i/24*Math.PI*2,wave=Math.sin(phase),lift=Math.cos(phase),lean=amplitude>45?22:10
    return createFrame(stance({lean,y:-Math.abs(lift)*(amplitude>45?11:4),arms:ball?carry:[95+wave*amplitude,-35,85-wave*amplitude,-35],legs:[90+wave*amplitude,Math.max(0,-lift)*85,90-wave*amplitude,Math.max(0,lift)*85],ball:ball?'RIGHT_HAND':'HIDDEN'}),i)
  });return {id:`rugby_${id}`,name,category:'Déplacements',description:ball?'Cycle avec ballon serré contre le buste.':'Cycle sur place, prêt à être déplacé dans le jeu.',fps:Math.round(24/seconds),loop:true,rootMotion:false,interpolation:'SMOOTH',frames}
}

function buildLibrary():AnimationClip[]{
  const clips:AnimationClip[]=[
    action('support_arrive','Soutien — arrivée basse','Ruck','Derniers appuis, mains prêtes et entrée dans la porte.',[stance({lean:20,legs:[48,65,122,-35],arms:[50,-40,70,-55]}),stance({lean:38,y:18,legs:[115,-30,52,70],arms:[25,-25,35,-35]}),crouch()],.75),
    action('ruck_bind','Ruck — liaison et protection','Ruck','Liaison aux épaules, dos bas et appuis alternés.',[stance({lean:65,y:22,arms:[10,80,15,85],legs:[45,85,120,-50]}),stance({lean:70,y:25,arms:[8,85,12,90],legs:[65,60,110,-35]}),stance({lean:64,y:22,arms:[10,80,15,85],legs:[45,85,120,-50]})],1.1,true),
    action('clearout_drive','Déblayage — impact et poussée','Ruck','Épaule engagée, fermeture des bras puis trois appuis vers l’avant.',[crouch(),stance({lean:70,y:28,arms:[0,60,5,75],legs:[45,90,135,-60]}),stance({lean:76,y:24,arms:[0,90,5,95],legs:[115,-45,50,80]}),stance({lean:68,y:20,arms:[10,80,15,85],legs:[50,80,115,-45]})],1.25),
    action('counter_ruck','Contre-ruck — poussée collective','Ruck','Appuis sous le bassin et poussée par-dessus le ballon.',[stance({lean:72,y:22,arms:[5,90,10,90],legs:[45,90,125,-55]}),stance({lean:77,y:25,arms:[0,95,5,95],legs:[70,60,105,-35]}),stance({lean:70,y:19,arms:[5,90,10,90],legs:[115,-40,55,75]})],1.1,true),
    action('contact_brace','Contact — absorber le choc','Contact','Recul du buste, genoux qui amortissent, reprise des appuis.',[crouch(),stance({lean:30,y:32,arms:[35,80,40,80],legs:[40,100,135,-65]}),stance({lean:52,y:24,arms:[15,85,20,90],legs:[60,70,115,-40]})],1.25),
    action('roll_away','Plaqueur — libération et roulade','Ruck','Libère le porteur puis se dégage sur le côté avant de se relever.',[ground(),stance({lean:115,y:90,arms:[135,-95,155,-105],legs:[160,-75,110,45]}),stance({lean:55,y:50,arms:[90,0,80,10],legs:[40,110,140,-70]}),crouch()],1.1),
    action('caterpillar_bind','Chenille — liaison des avants','Ruck','Main sur le partenaire devant, buste bas et petits appuis.',[stance({lean:68,y:18,arms:[-5,55,10,65],legs:[55,70,120,-45]}),stance({lean:72,y:21,arms:[0,60,5,70],legs:[100,-15,70,50]}),stance({lean:68,y:18,arms:[-5,55,10,65],legs:[55,70,120,-45]})],1.1,true),
    action('box_setup','Demi de mêlée — préparation du box kick','Ruck','Regard levé, flexion et mains vers la sortie de la chenille.',[stance({head:-20,arms:[55,-45,65,-55]}),stance({lean:55,y:25,arms:[75,0,80,5],legs:[55,65,110,-40]}),stance({lean:15,arms:carry,ball:'BOTH_HANDS'})],1.2),
    action('fall_forward','Impact — chute vers l’avant','Contact','Le choc casse les appuis, le buste bascule puis glisse au sol.',[ready(),stance({lean:38,y:6,arms:carry,legs:[45,85,145,-55],ball:'RIGHT_HAND'}),stance({lean:76,y:45,arms:[15,-20,80,-100],legs:[150,-55,165,-30],ball:'RIGHT_HAND'}),ground(),ground()],1.4),
    action('fall_back','Impact — chute sur le dos','Contact','Les appuis cèdent, le bassin recule et les épaules touchent le sol.',[ready(),stance({lean:-35,y:14,arms:carry,legs:[55,85,125,-50],ball:'RIGHT_HAND'}),stance({lean:-75,y:62,arms:[145,-100,150,-110],legs:[25,30,15,60],ball:'RIGHT_HAND'}),stance({lean:-92,y:92,arms:[150,-90,165,-100],legs:[0,15,20,-15],ball:'RIGHT_HAND'})],1.4),
    action('idle','Attente','Déplacements','Respiration et appuis détendus.',[stance(),stance({y:2,head:2}),stance({y:-1,head:-2})],2,true),
    action('ready','Attente avec ballon','Déplacements','Ballon protégé avant la prochaine action.',[ready(),stance({y:2,arms:carry,ball:'RIGHT_HAND'}),ready()],2,true),
    gait('walk','Marche',18,1.4),gait('jog','Footing',30,1.1),gait('run','Course',42,.9),gait('run_ball','Course avec ballon',42,.9,true),gait('sprint','Sprint',62,.65),gait('sprint_ball','Sprint avec ballon',62,.65,true),
    action('sidestep','Pas chassés défensifs','Déplacements','Déplacement latéral en restant bas.',[stance({x:-18,y:12,legs:[110,-20,70,20],arms:[150,-90,30,90]}),stance({x:0,y:7,legs:[92,0,88,0],arms:[150,-90,30,90]}),stance({x:18,y:12,legs:[110,-20,70,20],arms:[150,-90,30,90]})],1.1,true),
    action('dodge','Crochet / changement d’appui','Déplacements','Appui extérieur, feinte et relance.',[ready(),stance({x:-25,lean:-18,y:10,arms:carry,legs:[115,-35,65,40],ball:'RIGHT_HAND'}),stance({x:30,lean:28,arms:carry,legs:[45,70,125,15],ball:'RIGHT_HAND'}),ready()],1.1),
    action('brake','Freinage','Déplacements','Décélération et retour sur deux appuis.',[stance({lean:22,legs:[45,80,130,15]}),stance({lean:-18,y:12,legs:[55,25,110,-15],arms:[145,-65,40,60]}),stance()],.9),
    action('pass','Passe à droite','Ballon','Armé à deux mains, libération et accompagnement.',[stance({arms:[120,-120,130,-100],ball:'BOTH_HANDS'}),stance({lean:-10,arms:[155,-75,155,-90],ball:'BOTH_HANDS'}),stance({lean:18,arms:[5,-5,5,5],ball:'BOTH_HANDS'}),stance({lean:12,arms:[0,0,5,0],ball:'FREE',ballX:155,ballY:-95}),stance({ball:'FREE',ballX:230,ballY:-110})],1.1),
    action('catch','Réception de passe','Ballon','Mains vers le ballon puis protection contre le buste.',[stance({arms:[10,0,15,0],ball:'FREE',ballX:230,ballY:-78}),stance({arms:[10,0,15,0],ball:'FREE',ballX:125,ballY:-65}),stance({arms:[25,-25,35,-35],ball:'BOTH_HANDS'}),ready()],1.2),
    action('pickup','Ramassage au sol','Ballon','Flexion des jambes, prise à deux mains et redressement.',[stance({ball:'FREE',ballX:58,ballY:110}),stance({lean:62,y:24,arms:[85,5,90,0],legs:[45,85,115,-45],ball:'FREE',ballX:58,ballY:110}),stance({lean:45,y:24,arms:[55,-30,70,-40],legs:[55,70,110,-40],ball:'BOTH_HANDS'}),ready()],1.6),
    action('handoff','Raffut','Ballon','Bras libre tendu et ballon protégé.',[ready(),stance({lean:16,arms:[10,-15,105,-110],legs:[60,60,120,10],ball:'RIGHT_HAND'}),stance({lean:24,arms:[0,0,105,-110],legs:[60,60,120,10],ball:'RIGHT_HAND'}),ready()],1),
    action('offload','Offload après contact','Ballon','Passe à une main après déséquilibre.',[ready(),stance({lean:35,y:15,arms:[20,-20,105,-110],ball:'RIGHT_HAND'}),stance({lean:50,y:25,arms:[40,-20,5,0],ball:'RIGHT_HAND'}),stance({lean:65,y:45,ball:'FREE',ballX:180,ballY:-65})],1.3),
    action('try','Essai — aplatir','Essais', 'Le porteur se baisse et aplatit le ballon au sol.',[ready(),stance({lean:35,y:20,arms:[70,-25,70,-25],legs:[55,75,105,-35],ball:'BOTH_HANDS'}),stance({lean:66,y:34,arms:[80,5,80,5],legs:[40,100,105,-55],ball:'BOTH_HANDS'}),stance({lean:68,y:34,arms:[80,5,80,5],legs:[40,100,105,-55],ball:'BOTH_HANDS'})],1.5),
    action('dive_try','Plongeon à l’essai','Essais','Impulsion, extension vers la ligne et réception au sol.',[stance({lean:20,x:-55,arms:carry,legs:[45,80,125,10],ball:'RIGHT_HAND'}),stance({lean:48,x:-25,y:-20,arms:[10,-10,5,0],legs:[140,-45,155,-60],ball:'RIGHT_HAND'}),stance({lean:84,x:15,y:10,arms:[0,0,0,0],legs:[175,-10,170,-30],ball:'RIGHT_HAND'}),ground(),ground()],1.5),
    action('celebrate','Célébration d’essai','Essais','Bras levés et petit saut de victoire.',[stance(),stance({y:-20,arms:[-70,-10,-110,10],legs:[110,-35,70,35]}),stance({arms:[-70,-10,-110,10]}),stance({y:-12,arms:[-85,0,-95,0]})],1.7),
    action('tackle_low','Plaquage bas','Contact','Abaissement, épaule en avant et fermeture des bras.',[stance({lean:15,arms:[60,-40,65,-45]}),crouch(),stance({lean:72,x:20,y:35,arms:[0,15,5,25],legs:[155,-55,130,-40]}),stance({lean:85,x:35,y:80,arms:[10,75,15,85],legs:[170,-15,150,-45]})],1.3),
    action('tackle','Plaquage debout','Contact','Engagement à l’épaule et ceinturage.',[stance(),stance({lean:25,x:15,y:10,arms:[15,10,20,15],legs:[50,70,115,-25]}),stance({lean:45,x:25,y:18,arms:[0,100,10,110],legs:[55,80,125,-40]}),stance({lean:60,x:35,y:32,arms:[5,105,15,100],legs:[65,65,135,-45]})],1.3),
    action('tackled','Porteur plaqué','Contact','Contact, chute et ballon conservé.',[ready(),stance({lean:-25,y:15,arms:carry,legs:[55,75,125,-45],ball:'RIGHT_HAND'}),stance({lean:-65,y:55,arms:[140,-110,145,-120],legs:[35,30,20,55],ball:'RIGHT_HAND'}),stance({lean:-88,y:92,arms:[165,-110,160,-110],legs:[5,10,15,-10],ball:'RIGHT_HAND'})],1.5),
    action('present','Présentation du ballon','Contact','Au sol, extension des bras vers son camp.',[ground(),stance({lean:88,y:92,arms:[160,0,170,0],legs:[170,-15,175,-25],ball:'BOTH_HANDS'}),stance({lean:88,y:92,arms:[175,0,175,0],legs:[170,-15,175,-25],ball:'BOTH_HANDS'})],1.1),
    action('jackal','Grattage','Contact','Appuis larges, buste bas et mains sur le ballon.',[stance({lean:65,y:20,arms:[90,5,90,5],legs:[35,100,130,-70],ball:'FREE',ballX:70,ballY:100}),stance({lean:58,y:16,arms:[95,-15,100,-15],legs:[35,100,130,-70],ball:'FREE',ballX:70,ballY:100}),stance({lean:65,y:22,arms:[90,5,90,5],legs:[35,100,130,-70],ball:'FREE',ballX:70,ballY:100})],1,true),
    action('clearout','Déblayage du ruck','Contact','Arrivée basse puis poussée avec l’épaule.',[stance({lean:20,x:-25}),crouch(),stance({lean:72,x:25,y:24,arms:[5,65,10,75],legs:[135,-45,55,60]}),stance({lean:68,x:38,y:20,arms:[0,65,5,75],legs:[115,-20,65,40]})],1.3),
    action('getup','Se relever','Contact','Appui sur les mains, un genou puis retour debout.',[ground(),stance({lean:65,y:55,arms:[90,0,90,0],legs:[20,120,155,-95]}),crouch(),stance()],1.8),
    action('scrum_bind','Mêlée — liaison','Phases arrêtées','Flexion, liaison et engagement.',[stance(),crouch(),stance({lean:82,y:12,arms:[-10,90,0,100],legs:[45,85,125,-65]})],1.4),
    action('scrum','Mêlée — poussée','Phases arrêtées','Cycle bas de poussée, joueur individuel à aligner avec le pack.',[stance({lean:82,y:12,x:-4,arms:[-10,90,0,100],legs:[45,85,125,-65]}),stance({lean:78,y:8,x:4,arms:[-10,90,0,100],legs:[55,65,115,-50]})],.9,true),
    action('maul','Maul — poussée','Phases arrêtées','Liaison debout et petits appuis de poussée.',[stance({lean:28,y:8,arms:[10,90,15,90],legs:[65,45,115,-25]}),stance({lean:32,y:6,arms:[10,90,15,90],legs:[110,-20,70,40]})],1,true),
    action('lineout_throw','Touche — lancer','Phases arrêtées','Ballon derrière la tête puis lancer à deux mains.',[stance({arms:[-110,-55,-70,-55],ball:'BOTH_HANDS'}),stance({lean:-12,arms:[-120,-75,-100,-70],ball:'BOTH_HANDS'}),stance({lean:10,arms:[-55,0,-55,0],ball:'BOTH_HANDS'}),stance({arms:[-45,0,-45,0],ball:'FREE',ballX:155,ballY:-225})],1.4),
    action('lineout_jump','Touche — saut et prise','Phases arrêtées','Saut vertical, réception aérienne et retour au sol.',[stance({ball:'FREE',ballX:65,ballY:-225}),stance({y:20,arms:[140,-50,40,50],legs:[50,80,130,-80],ball:'FREE',ballX:35,ballY:-205}),stance({y:-65,arms:[-85,0,-95,0],ball:'BOTH_HANDS'}),stance({y:-45,arms:carry,ball:'RIGHT_HAND'}),ready()],1.8),
    action('lineout_lift','Touche — soutien','Phases arrêtées','Flexion puis extension des bras pour soutenir le sauteur.',[crouch(),stance({arms:[-65,0,-110,0]}),stance({arms:[-85,0,-95,0]}),crouch()],1.8),
  ]
  const pass=clips.find(c=>c.id==='rugby_pass')!;clips.push({...clone(pass),id:'rugby_pass_left',name:'Passe à gauche',frames:pass.frames.map((f,i)=>createFrame(mirrorPose(f.pose),i))})
  const kickStart=stance({x:-35,arms:carry,ball:'BOTH_HANDS'}),windup=stance({lean:-12,arms:[140,-35,30,35],legs:[90,0,125,85],ball:'FREE',ballX:40,ballY:75}),strike=stance({lean:-18,arms:[145,-25,25,30],legs:[92,-4,5,0],ball:'FREE',ballX:85,ballY:35})
  clips.push(
    action('punt','Dégagement au pied','Coups de pied','Lâcher du ballon, frappe et accompagnement.',[kickStart,windup,strike,stance({lean:-8,legs:[90,0,-25,10],ball:'FREE',ballX:190,ballY:-155}),stance({ball:'FREE',ballX:250,ballY:-220})],1.6),
    action('grubber','Coup de pied rasant','Coups de pied','Frappe basse et rebonds vers l’avant.',[kickStart,windup,stance({lean:15,legs:[90,0,40,-10],ball:'FREE',ballX:90,ballY:98}),stance({ball:'FREE',ballX:145,ballY:75}),stance({ball:'FREE',ballX:195,ballY:110}),stance({ball:'FREE',ballX:245,ballY:92})],1.6),
    action('chip','Petit par-dessus','Coups de pied','Frappe courte avec trajectoire en cloche.',[kickStart,windup,strike,stance({ball:'FREE',ballX:140,ballY:-165}),stance({ball:'FREE',ballX:200,ballY:-210}),stance({ball:'FREE',ballX:245,ballY:-130})],1.8),
    action('drop','Drop goal','Coups de pied','Lâcher, rebond au sol et frappe après le rebond.',[ready(),stance({arms:[75,-10,75,-10],ball:'FREE',ballX:45,ballY:45}),stance({legs:[90,0,130,75],ball:'FREE',ballX:50,ballY:110}),stance({legs:[90,0,55,-10],ball:'FREE',ballX:60,ballY:88}),strike,stance({ball:'FREE',ballX:235,ballY:-210})],1.9),
    action('penalty','Pénalité — tir au but','Coups de pied','Prise d’élan, pied d’appui, frappe du ballon posé.',[stance({x:-65,ball:'FREE',ballX:45,ballY:110}),stance({x:-35,lean:10,legs:[55,60,120,-20],ball:'FREE',ballX:45,ballY:110}),stance({lean:-8,legs:[85,5,140,65],ball:'FREE',ballX:45,ballY:110}),stance({lean:-18,legs:[90,0,25,-10],ball:'FREE',ballX:105,ballY:25}),stance({lean:-8,legs:[90,0,-15,0],ball:'FREE',ballX:235,ballY:-210})],2.2),
    action('conversion','Transformation','Coups de pied','Concentration, course oblique et frappe placée.',[stance({x:-85,head:15,ball:'FREE',ballX:45,ballY:110}),stance({x:-85,head:0,ball:'FREE',ballX:45,ballY:110}),stance({x:-40,lean:12,legs:[55,65,120,-15],ball:'FREE',ballX:45,ballY:110}),windup,strike,stance({ball:'FREE',ballX:240,ballY:-210})],2.6),
    action('tap','Pénalité jouée à la main','Coups de pied','Petit coup de pied de reprise puis ballon récupéré.',[ready(),stance({arms:[65,-25,65,-25],legs:[90,0,45,65],ball:'FREE',ballX:45,ballY:40}),stance({arms:[65,-25,65,-25],legs:[90,0,45,-10],ball:'FREE',ballX:65,ballY:52}),stance({arms:carry,ball:'BOTH_HANDS'}),ready()],1.3),
    action('restart','Renvoi / coup d’envoi','Coups de pied','Élan et drop de renvoi avec accompagnement.',[stance({x:-55,arms:carry,ball:'BOTH_HANDS'}),stance({x:-20,lean:12,legs:[60,55,125,10],ball:'FREE',ballX:45,ballY:55}),stance({legs:[90,0,130,80],ball:'FREE',ballX:50,ballY:110}),strike,stance({legs:[90,0,-20,0],ball:'FREE',ballX:230,ballY:-230})],1.9),
    action('box_kick','Box-kick du demi de mêlée','Coups de pied','Deux pas derrière le ruck, lâcher haut puis frappe sous pression.',[stance({x:-35,lean:-8,arms:carry,ball:'BOTH_HANDS'}),stance({x:-12,lean:-15,arms:[40,-35,55,-45],ball:'BOTH_HANDS',legs:[55,70,120,-20]}),stance({lean:-22,arms:[65,-20,70,-25],legs:[90,0,25,70],ball:'FREE',ballX:42,ballY:58}),stance({lean:-15,legs:[90,0,-20,5],ball:'FREE',ballX:135,ballY:-155}),stance({ball:'FREE',ballX:230,ballY:-240})],1.6),
    action('charge_down','Contre d’un coup de pied','Défense','Course, bras tendus et ballon dévié au contact.',[stance({x:-45,lean:18,arms:[55,-45,65,-55],legs:[45,80,125,10]}),stance({x:-10,y:-15,lean:25,arms:[-55,0,-70,0],legs:[120,-35,55,75]}),stance({x:15,y:-28,arms:[-75,0,-85,0],ball:'FREE',ballX:70,ballY:-135}),stance({x:30,y:0,arms:[-55,20,-70,-20],ball:'FREE',ballX:135,ballY:-70})],1.15),
    action('intercept','Interception','Ballon','Lecture de la passe, main dans la ligne puis ballon sécurisé.',[stance({x:-35,arms:[35,-15,45,-20],ball:'FREE',ballX:175,ballY:-80}),stance({x:-5,lean:12,arms:[5,0,25,-10],ball:'FREE',ballX:105,ballY:-70}),stance({x:15,arms:[20,-25,35,-35],ball:'BOTH_HANDS'}),ready()],1.15),
    action('scrum_hook','Mêlée — talonnage','Phases arrêtées','Le talonneur garde la liaison et ramène le ballon du pied.',[stance({lean:82,y:12,arms:[-10,90,0,100],legs:[45,85,125,-65],ball:'FREE',ballX:35,ballY:105}),stance({lean:80,y:10,arms:[-10,90,0,100],legs:[25,115,125,-65],ball:'FREE',ballX:20,ballY:105}),stance({lean:78,y:8,arms:[-10,90,0,100],legs:[80,15,125,-65],ball:'FREE',ballX:-20,ballY:105})],1.05),
    action('injury','Joueur blessé','Transitions','Le joueur ralentit, se tient la jambe puis s’assoit au sol.',[stance({lean:8,legs:[65,55,115,-20]}),stance({lean:42,y:30,arms:[65,-25,80,-35],legs:[30,105,145,-80]}),stance({lean:62,y:65,arms:[95,-20,105,-25],legs:[15,120,165,-75]}),stance({lean:70,y:82,arms:[100,-15,110,-20],legs:[5,130,170,-65]})],2.2),
    action('substitution','Sortie / remplacement','Transitions','Salut au public puis marche vers la touche.',[stance(),stance({arms:[108,-15,-80,0]}),stance({x:25,arms:[95,-30,85,-30],legs:[115,-25,65,25]}),stance({x:65,arms:[80,-30,100,-30],legs:[65,25,115,-25]})],1.8)
  )
  const whistle=()=>stance({arms:[108,-15,195,65]})
  clips.push(
    action('ref_whistle','Arbitre — coup de sifflet','Arbitre','Main à la bouche pour interrompre le jeu.',[stance(),whistle(),whistle(),stance()],1.4),
    action('ref_yellow','Arbitre — carton jaune','Arbitre','Sortie du carton et bras tendu au-dessus de la tête.',[whistle(),stance({arms:[108,-15,100,-120]}),stance({arms:[108,-15,-80,0],card:'yellow'}),stance({arms:[108,-15,-80,0],card:'yellow'})],2),
    action('ref_red','Arbitre — carton rouge','Arbitre','Carton rouge montré et maintenu bras levé.',[whistle(),stance({arms:[108,-15,110,-125]}),stance({arms:[108,-15,-85,0],card:'red'}),stance({arms:[108,-15,-85,0],card:'red'})],2.2),
    action('ref_penalty','Arbitre — pénalité','Arbitre','Bras levé en diagonale vers l’équipe bénéficiaire.',[whistle(),stance({arms:[108,-15,-45,0]}),stance({arms:[108,-15,-45,0]})],1.7),
    action('ref_advantage','Arbitre — avantage','Arbitre','Bras tendu horizontalement dans le sens du jeu.',[stance(),stance({arms:[108,-15,0,0]}),stance({arms:[108,-15,0,0]}),stance()],1.8),
    action('ref_try','Arbitre — essai accordé','Arbitre','Bras vertical pour accorder l’essai.',[whistle(),stance({arms:[108,-15,-90,0]}),stance({arms:[108,-15,-90,0]})],1.8),
    action('ref_scrum','Arbitre — mêlée ordonnée','Arbitre','Mouvement des avant-bras devant le buste.',[whistle(),stance({arms:[65,-140,115,140]}),stance({arms:[75,-155,105,155]}),stance({arms:[65,-140,115,140]})],1.8),
    action('ref_knockon','Arbitre — signal en-avant','Arbitre','Main ouverte qui accompagne le ballon vers l’avant.',[whistle(),stance({arms:[108,-15,-70,75]}),stance({arms:[108,-15,-20,25]}),stance({arms:[108,-15,-70,75]}),stance({arms:[108,-15,-20,25]})],2),
    action('ref_timeoff','Arbitre — arrêt du temps','Arbitre','Les bras se croisent au-dessus de la tête.',[whistle(),stance({arms:[-60,-70,-120,70]}),stance({arms:[-60,-70,-120,70]})],1.8),
    action('ref_end','Arbitre — fin du match','Arbitre','Sifflet puis bras levés pour marquer la fin.',[whistle(),whistle(),stance({arms:[-65,0,-115,0]}),stance({arms:[-65,0,-115,0]})],2),
    action('foul_knockon','Faute — en-avant','Fautes','Réception manquée, ballon échappé vers l’avant et rebond.',[stance({arms:[10,0,15,0],ball:'FREE',ballX:160,ballY:-70}),stance({arms:[35,-25,40,-30],ball:'BOTH_HANDS'}),stance({lean:18,arms:[25,15,35,10],ball:'FREE',ballX:115,ballY:5,ballAngle:90}),stance({lean:30,arms:[55,5,60,5],ball:'FREE',ballX:155,ballY:108,ballAngle:220}),stance({ball:'FREE',ballX:195,ballY:70,ballAngle:350}),stance({ball:'FREE',ballX:225,ballY:108,ballAngle:450})],1.9),
    action('foul_forwardpass','Faute — passe en avant','Fautes','Passe libérée dans le sens de la course.',[ready(),stance({lean:15,x:10,arms:[5,0,10,0],ball:'BOTH_HANDS'}),stance({lean:15,x:20,ball:'FREE',ballX:155,ballY:-80,ballAngle:120}),stance({x:25,ball:'FREE',ballX:230,ballY:-60,ballAngle:250})],1.2),
    action('foul_high','Faute — plaquage haut','Fautes','Bras engagé à hauteur de tête ; à associer à la réaction au contact haut.',[stance({lean:10}),stance({lean:20,x:20,arms:[-25,0,-20,10],legs:[55,65,120,-20]}),stance({lean:35,x:35,arms:[-15,105,-10,100],legs:[60,60,115,-20]}),stance({lean:40,x:40,arms:[-10,110,-5,105]})],1.3),
    action('foul_punch','Faute — coup de poing','Fautes','Armé, extension brève du bras et retour en garde.',[stance({arms:[65,-135,115,-150]}),stance({lean:-15,arms:[65,-135,165,-130]}),stance({lean:18,x:15,arms:[65,-135,-10,0]}),stance({arms:[65,-135,115,-150]})],.8),
    action('foul_kick','Faute — coup de pied','Fautes','Geste de pied vers un adversaire, sans ballon.',[stance({arms:[65,-100,115,-120]}),stance({lean:-15,arms:[65,-100,115,-120],legs:[90,0,15,115]}),stance({lean:-22,arms:[70,-110,120,-130],legs:[90,0,-10,0]}),stance({arms:[65,-100,115,-120]})],1),
    action('foul_tip','Faute — plaquage cathédrale','Fautes','Joueur qui soulève puis bascule son adversaire ; utiliser aussi la chute renversée.',[stance(),stance({lean:40,y:30,arms:[20,85,25,85],legs:[45,90,125,-65]}),stance({lean:-18,y:-10,arms:[-55,75,-60,70],legs:[85,10,95,-10]}),stance({lean:62,y:22,arms:[15,25,20,20],legs:[55,65,115,-30]})],1.8),
    action('foul_late','Faute — charge sans ballon','Fautes','Charge à l’épaule sans fermer les bras.',[stance({x:-35,lean:15}),stance({x:0,lean:42,arms:[130,-15,110,-20],legs:[45,75,125,15]}),stance({x:35,lean:55,arms:[130,-15,110,-20],legs:[65,60,120,-30]})],1),
    action('foul_trip','Faute — croche-pied','Fautes','Jambe tendue en travers de la course.',[stance(),stance({lean:-15,arms:[140,-35,40,35],legs:[90,0,25,0]}),stance({lean:-15,legs:[90,0,25,0]}),stance()],1.2),
    action('reaction_high','Réaction — contact haut','Réactions','Recul du buste, mains hautes et perte d’équilibre.',[ready(),stance({lean:-25,head:-20,arms:[-45,-80,-125,80],legs:[65,45,115,-25]}),stance({lean:-65,y:55,arms:[-20,-60,-160,60],legs:[25,35,15,65]}),stance({lean:-88,y:92,arms:[-10,-45,-170,45],legs:[5,10,15,0]})],1.4),
    action('reaction_hit','Réaction — coup reçu','Réactions','Recul bref et protection du visage.',[stance(),stance({lean:-30,x:-15,head:-20,arms:[-35,-110,-145,110],legs:[60,55,115,-40]}),stance({lean:20,y:20,arms:[-20,-100,-160,100],legs:[50,80,120,-55]}),stance({arms:[65,-130,115,130]})],1.2),
    action('reaction_trip','Réaction — chute en avant','Réactions','Déséquilibre vers l’avant et réception sur les mains.',[stance({lean:15,legs:[50,70,120,10]}),stance({lean:55,y:10,arms:[10,0,15,0],legs:[125,-45,150,-70]}),stance({lean:88,y:75,arms:[70,0,75,0],legs:[170,-10,165,-25]}),{...ground(),ball:{...ground().ball,attachment:'HIDDEN'}}],1.4),
    action('reaction_tip','Réaction — chute renversée','Réactions','Joueur soulevé, retourné puis réception stylisée au sol.',[ready(),stance({y:-40,lean:-35,arms:carry,legs:[30,65,150,-65],ball:'RIGHT_HAND'}),(()=>{const p=stance({y:-35,arms:[15,40,165,-40],legs:[70,25,110,-25],ball:'RIGHT_HAND'});p.root.rotation=150;return p})(),(()=>{const p=stance({y:40,arms:[25,45,155,-45],legs:[60,25,120,-25],ball:'RIGHT_HAND'});p.root.rotation=100;return p})(),ground()],2)
  )
  // Keep angles unwrapped: a 720° flight must visibly complete two revolutions.
  for(const clip of clips.filter(c=>c.category==='Coups de pied')){
    let start=-1
    clip.frames.forEach((f,i)=>{
      if(f.pose.ball.attachment==='FREE'&&f.pose.ball.x>75){if(start<0)start=i;f.pose.ball.rotation=-20+(i-start)/clip.fps*(clip.id==='rugby_grubber'?900:600)}
      else start=-1
    })
  }
  return clips
}

export const rugbyAnimations=buildLibrary()
export const RUGBY_LIBRARY_VERSION=3
export function installRugbyLibrary(project:ProjectData,force=false):number {
  if(!force&&(project.rugbyLibraryVersion??0)>=RUGBY_LIBRARY_VERSION)return 0
  const existing=new Set(project.animations.map(c=>c.id)),missing=rugbyAnimations.filter(c=>!existing.has(c.id))
  project.animations.push(...clone(missing));project.rugbyLibraryVersion=RUGBY_LIBRARY_VERSION;return missing.length
}
