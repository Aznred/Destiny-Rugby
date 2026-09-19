import type { Character, JointId, SkeletonPose, Vec2 } from './models'
import { computeSkeleton } from './engine'
import type { SkeletonResult } from './engine'

interface SpriteDimensions {
  headW:number; headH:number; neckW:number; torsoTop:number; torsoBottom:number
  armU:number; armL:number; legU:number; legL:number; shortsH:number; handSize:number; footSize:number
}

const SPRITE_SCALE = 2.2
const ZIP_DIMENSIONS: Record<Character['appearance']['bodyType'],SpriteDimensions> = {
  prop:{headW:16,headH:18,neckW:9,torsoTop:22,torsoBottom:20,armU:9,armL:8,legU:12,legL:10,shortsH:15,handSize:6,footSize:7},
  forward:{headW:15,headH:18,neckW:8,torsoTop:20,torsoBottom:18,armU:8,armL:7,legU:11,legL:9,shortsH:14,handSize:6,footSize:7},
  athletic:{headW:14,headH:18,neckW:8,torsoTop:18,torsoBottom:15,armU:7,armL:6,legU:10,legL:8,shortsH:13,handSize:5,footSize:6},
  back:{headW:14,headH:17,neckW:7,torsoTop:17,torsoBottom:14,armU:7,armL:6,legU:9,legL:7,shortsH:12,handSize:5,footSize:6},
  winger:{headW:13,headH:17,neckW:7,torsoTop:16,torsoBottom:13,armU:6,armL:5,legU:9,legL:7,shortsH:12,handSize:5,footSize:6}
}

const spriteDimensions = (character:Character):SpriteDimensions => {
  const d=ZIP_DIMENSIONS[character.appearance.bodyType] ?? ZIP_DIMENSIONS.athletic,b=character.appearance.body,s=SPRITE_SCALE
  return {
    headW:d.headW*s*b.headScale,headH:d.headH*s*b.headScale,neckW:d.neckW*s*b.torsoWidth,
    torsoTop:d.torsoTop*s*b.shoulderWidth,torsoBottom:d.torsoBottom*s*b.torsoWidth,
    armU:d.armU*s*b.armThickness,armL:d.armL*s*b.armThickness,
    legU:d.legU*s*b.legThickness,legL:d.legL*s*b.legThickness,shortsH:d.shortsH*s*b.torsoLength,
    handSize:d.handSize*s*b.armThickness,footSize:d.footSize*s*b.legThickness
  }
}

export interface RenderOptions {
  width: number
  height: number
  zoom?: number
  pan?: Vec2
  showField?: boolean
  showSkeleton?: boolean
  selectedJoint?: JointId | null
  alpha?: number
  muted?: boolean
}

const polygon = (ctx: CanvasRenderingContext2D, points: Vec2[], color: string) => {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(Math.round(points[0].x),Math.round(points[0].y));for(let i=1;i<points.length;i++)ctx.lineTo(Math.round(points[i].x),Math.round(points[i].y));ctx.closePath();ctx.fill()
}

const line = (ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, width: number, endWidth: number, color: string, overlap = 4*SPRITE_SCALE) => {
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length,nx=-uy,ny=ux
  const sx=a.x-ux*overlap,sy=a.y-uy*overlap,ex=b.x+ux*overlap,ey=b.y+uy*overlap
  polygon(ctx,[{x:sx+nx*width/2,y:sy+ny*width/2},{x:ex+nx*endWidth/2,y:ey+ny*endWidth/2},{x:ex-nx*endWidth/2,y:ey-ny*endWidth/2},{x:sx-nx*width/2,y:sy-ny*width/2}],color)
}

const flatJoint = (ctx:CanvasRenderingContext2D,p:Vec2,size:number,color:string) => {ctx.fillStyle=color;ctx.beginPath();ctx.arc(Math.round(p.x),Math.round(p.y),size/2,0,Math.PI*2);ctx.fill()}

const ellipseAt = (ctx: CanvasRenderingContext2D, center: Vec2, rx: number, ry: number, angle: number, fill: string, stroke = '#0a100e') => {
  ctx.beginPath(); ctx.ellipse(center.x, center.y, rx, ry, angle, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke() }
}

const midpoint = (a: Vec2, b: Vec2, amount = .5): Vec2 => ({ x: a.x + (b.x-a.x)*amount, y: a.y + (b.y-a.y)*amount })

export class CharacterRenderer {
  draw(ctx: CanvasRenderingContext2D, character: Character, pose: SkeletonPose, options: RenderOptions): SkeletonResult {
    const { width, height } = options
    ctx.imageSmoothingEnabled = false
    if (options.showField !== false) this.drawField(ctx, width, height)
    const skeleton = computeSkeleton(character, pose)
    ctx.save()
    ctx.globalAlpha = options.alpha ?? 1
    const pan = options.pan ?? { x: 0, y: 0 }, zoom = options.zoom ?? 1
    ctx.translate(width / 2 + pan.x, height / 2 + 35 + pan.y)
    ctx.scale(zoom, zoom)
    if (options.muted) ctx.filter = 'saturate(.3) brightness(1.15)'
    this.drawCharacter(ctx, character, pose, skeleton)
    ctx.filter = 'none'
    if (options.showSkeleton) this.drawSkeleton(ctx, skeleton, options.selectedJoint ?? null)
    ctx.restore()
    return skeleton
  }

  drawField(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save(); ctx.clearRect(0,0,width,height)
    const gradient = ctx.createLinearGradient(0,0,width,height); gradient.addColorStop(0,'#237f59'); gradient.addColorStop(1,'#176847')
    ctx.fillStyle = gradient; ctx.fillRect(0,0,width,height)
    for (let x=0;x<width;x+=96) { ctx.fillStyle = Math.floor(x/96)%2 ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.026)'; ctx.fillRect(x,0,96,height) }
    ctx.strokeStyle='rgba(222,250,233,.48)';ctx.lineWidth=2;ctx.setLineDash([13,11]);ctx.beginPath();ctx.moveTo(0,height*.69);ctx.lineTo(width,height*.69);ctx.stroke();ctx.setLineDash([])
    ctx.strokeStyle='rgba(222,250,233,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(width*.17,0);ctx.lineTo(width*.17,height);ctx.moveTo(width*.83,0);ctx.lineTo(width*.83,height);ctx.stroke()
    const vignette = ctx.createRadialGradient(width/2,height/2,40,width/2,height/2,Math.max(width,height)*.7);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'rgba(3,35,21,.28)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);ctx.restore()
  }

  private drawCharacter(ctx: CanvasRenderingContext2D, character: Character, pose: SkeletonPose, s: SkeletonResult) {
    const a = character.appearance, j = s.joints, d=spriteDimensions(character)
    ctx.save();ctx.shadowColor='transparent';ellipseAt(ctx,{x:j.pelvis.x,y:s.rig.thigh+s.rig.shin+9},17*SPRITE_SCALE,4*SPRITE_SCALE,0,'rgba(0,0,0,.18)','');ctx.restore()
    const far: 'left' | 'right' = pose.orientation === 'back' || pose.orientation === 'right' ? 'right' : 'left'
    this.drawLeg(ctx, far, j, d, a)
    this.drawArm(ctx, far, j, d, a)
    this.drawLeg(ctx, far === 'left' ? 'right' : 'left', j, d, a)
    line(ctx,{x:j.neck.x,y:j.neck.y-4*SPRITE_SCALE},midpoint(j.leftShoulder,j.rightShoulder,.5),d.neckW,d.neckW+SPRITE_SCALE,a.skin,5*SPRITE_SCALE)
    this.drawTorso(ctx, j, d, character)
    this.drawShorts(ctx,j,d,a)
    this.drawArm(ctx, far === 'left' ? 'right' : 'left', j, d, a)
    this.drawHead(ctx, j, s, d, character, pose)
    this.drawBall(ctx, pose, j)
    if(pose.refereeCard){const hand=pose.refereeCardHand==='left'?'leftHand':'rightHand';ctx.save();ctx.translate(j[hand].x,j[hand].y);ctx.rotate((s.angles[hand]??0)+Math.PI/2);ctx.fillStyle=pose.refereeCard==='red'?'#f53536':'#ffdf25';ctx.fillRect(-10,-25,20,29);ctx.strokeStyle='#392a16';ctx.lineWidth=1.5;ctx.strokeRect(-10,-25,20,29);ctx.restore()}
  }

  private drawLeg(ctx: CanvasRenderingContext2D, side: 'left'|'right', j: SkeletonResult['joints'], d:SpriteDimensions, a: Character['appearance']) {
    const hip=j[`${side}Hip`], knee=j[`${side}Knee`], ankle=j[`${side}Ankle`], foot=j[`${side}Foot`]
    line(ctx,hip,knee,d.legU,d.legU-SPRITE_SCALE,a.skin,5*SPRITE_SCALE);flatJoint(ctx,hip,d.legU,a.skin);flatJoint(ctx,knee,d.legU,a.skin)
    const sockStart=midpoint(knee,ankle,.48)
    line(ctx,knee,sockStart,d.legL,d.legL-SPRITE_SCALE,a.skin,5*SPRITE_SCALE)
    line(ctx,sockStart,ankle,d.legL+SPRITE_SCALE,d.legL,a.kit.socks,5*SPRITE_SCALE);flatJoint(ctx,sockStart,d.legL,a.kit.socks)
    const dx=foot.x-ankle.x,dy=foot.y-ankle.y,length=Math.hypot(dx,dy)||1,bootEnd={x:ankle.x+dx/length*(d.footSize+3*SPRITE_SCALE),y:ankle.y+dy/length*(d.footSize+3*SPRITE_SCALE)}
    line(ctx,ankle,bootEnd,d.footSize+SPRITE_SCALE,4*SPRITE_SCALE,a.kit.boots,SPRITE_SCALE);flatJoint(ctx,ankle,d.footSize,a.kit.boots)
  }

  private drawArm(ctx: CanvasRenderingContext2D, side: 'left'|'right', j: SkeletonResult['joints'], d:SpriteDimensions, a: Character['appearance']) {
    const shoulder=j[`${side}Shoulder`], elbow=j[`${side}Elbow`], hand=j[`${side}Hand`],sleeveEnd=midpoint(shoulder,elbow,.28)
    line(ctx,shoulder,sleeveEnd,d.armU+2*SPRITE_SCALE,d.armU,a.kit.primary,5*SPRITE_SCALE)
    line(ctx,sleeveEnd,elbow,d.armU,d.armL,a.skin,5*SPRITE_SCALE);flatJoint(ctx,shoulder,d.armU+SPRITE_SCALE,a.kit.primary);flatJoint(ctx,elbow,d.armL+SPRITE_SCALE,a.skin)
    line(ctx,elbow,hand,d.armL,Math.max(4*SPRITE_SCALE,d.armL-SPRITE_SCALE),a.skin,5*SPRITE_SCALE);flatJoint(ctx,hand,d.handSize,a.skin)
  }

  private bodyBasis(j:SkeletonResult['joints']) {
    const top=midpoint(j.leftShoulder,j.rightShoulder),dx=top.x-j.pelvis.x,dy=top.y-j.pelvis.y,length=Math.hypot(dx,dy)||1
    const up={x:dx/length,y:dy/length},side={x:-up.y,y:up.x},down={x:-up.x,y:-up.y}
    return {top,length,up,side,down}
  }

  private drawTorso(ctx: CanvasRenderingContext2D, j: SkeletonResult['joints'], d:SpriteDimensions, character: Character) {
    const kit=character.appearance.kit,{length,side,down}=this.bodyBasis(j),t=-length-5*SPRITE_SCALE,b=4*SPRITE_SCALE,lt=-d.torsoTop/2,rt=d.torsoTop/2,lb=-d.torsoBottom/2,rb=d.torsoBottom/2
    ctx.save();ctx.transform(side.x,side.y,down.x,down.y,j.pelvis.x,j.pelvis.y);polygon(ctx,[{x:lt,y:t},{x:rt,y:t},{x:rb,y:b},{x:lb,y:b}],kit.primary)
    ctx.beginPath();ctx.moveTo(lt,t);ctx.lineTo(rt,t);ctx.lineTo(rb,b);ctx.lineTo(lb,b);ctx.closePath();ctx.clip();ctx.fillStyle=kit.secondary
    switch(kit.pattern){
      case 'HOOPS':case 'HORIZONTAL_STRIPES':for(let y=t+7*SPRITE_SCALE;y<b;y+=9*SPRITE_SCALE)ctx.fillRect(lt,y,rt-lt,4*SPRITE_SCALE);break
      case 'VERTICAL_STRIPES':ctx.fillRect(-4*SPRITE_SCALE,t,8*SPRITE_SCALE,b-t);break
      case 'CHEST_STRIPE':ctx.fillRect(lt,t+(b-t)*.42,rt-lt,7*SPRITE_SCALE);break
      case 'DIAGONAL':ctx.save();ctx.rotate(-.55);ctx.fillRect(-70*SPRITE_SCALE,-5*SPRITE_SCALE,140*SPRITE_SCALE,10*SPRITE_SCALE);ctx.restore();break
      case 'SHOULDERS':ctx.fillRect(lt,t,rt-lt,7*SPRITE_SCALE);break
      case 'SLEEVES':ctx.fillRect(lt,t,5*SPRITE_SCALE,b-t);ctx.fillRect(rt-5*SPRITE_SCALE,t,5*SPRITE_SCALE,b-t);break
    }
    ctx.restore();ctx.save();ctx.transform(side.x,side.y,down.x,down.y,j.pelvis.x,j.pelvis.y);ctx.fillStyle='#fff';ctx.font=`bold ${8*SPRITE_SCALE}px monospace`;ctx.textAlign='center';ctx.fillText(String(character.appearance.number),0,(t+b)/2+4*SPRITE_SCALE);ctx.restore()
  }

  private drawShorts(ctx:CanvasRenderingContext2D,j:SkeletonResult['joints'],d:SpriteDimensions,a:Character['appearance']) {
    const {side,down}=this.bodyBasis(j),hip=midpoint(j.leftHip,j.rightHip),offsetX=(hip.x-j.pelvis.x)*side.x+(hip.y-j.pelvis.y)*side.y,offsetY=(hip.x-j.pelvis.x)*down.x+(hip.y-j.pelvis.y)*down.y,t=offsetY-3*SPRITE_SCALE,b=offsetY+d.shortsH*.7
    const waist=d.torsoBottom/2+SPRITE_SCALE,hem=waist+SPRITE_SCALE
    ctx.save();ctx.transform(side.x,side.y,down.x,down.y,j.pelvis.x,j.pelvis.y);polygon(ctx,[{x:offsetX-waist,y:t},{x:offsetX+waist,y:t},{x:offsetX+hem,y:b},{x:offsetX+2*SPRITE_SCALE,y:b},{x:offsetX,y:b-4*SPRITE_SCALE},{x:offsetX-2*SPRITE_SCALE,y:b},{x:offsetX-hem,y:b}],a.kit.shorts);ctx.restore()
  }

  private drawHead(ctx: CanvasRenderingContext2D, j: SkeletonResult['joints'], s: SkeletonResult, d:SpriteDimensions, character: Character, pose: SkeletonPose) {
    const a=character.appearance,angle=(s.angles.head ?? 0)+Math.PI/2,u=d.headH/18,w=d.headW,h=d.headH
    ctx.save();ctx.translate(Math.round(j.head.x),Math.round(j.head.y));ctx.rotate(angle);ctx.fillStyle=a.skin;ctx.fillRect(-w/2,-h/2,w,h);ctx.fillStyle=a.hair.color
    const hair=a.hair.style
    if(hair==='buzz')ctx.fillRect(-w/2,-10*u,w,4*u)
    else if(hair==='short'){ctx.fillRect(-w/2-u,-11*u,w+2*u,6*u);ctx.fillRect(-w/2-u,-7*u,4*u,6*u)}
    else if(hair==='fade'){ctx.fillRect(-w/2,-10*u,w,4*u);ctx.fillRect(-w/4,-13*u,w/2,4*u)}
    else if(hair==='curly'){for(let x=-6*u;x<=6*u;x+=4*u)ctx.fillRect(x,-12*u-Math.round(Math.abs(x/u)/5)*u,5*u,5*u)}
    else if(hair==='afro'){ctx.beginPath();ctx.arc(0,-6*u,w*.72,Math.PI,Math.PI*2);ctx.fill()}
    else if(hair==='mullet'){ctx.fillRect(-w/2,-11*u,w,6*u);ctx.fillRect(-w/2,-6*u,4*u,13*u)}
    else if(hair!=='bald'){ctx.fillRect(-w/2-u,-11*u,w+2*u,6*u);ctx.fillRect(-w/2-u,-7*u,4*u,6*u)}
    if(pose.orientation!=='back'){
      const facingLeft=pose.orientation==='left';ctx.fillStyle=a.skin;ctx.fillRect(facingLeft?-w/2-3*u:w/2-u,-u,4*u,4*u);ctx.fillStyle='#1D1714';ctx.fillRect(facingLeft?-4*u:2*u,-3*u,2*u,2*u)
      if(a.facialHair.style!=='none'){ctx.fillStyle=a.facialHair.color;ctx.fillRect(-4*u,3*u,8*u,3*u);if(a.facialHair.style!=='moustache'){ctx.fillRect(-5*u,5*u,10*u,5*u);ctx.fillRect(-3*u,9*u,6*u,3*u)}}
    }
    ctx.restore()
  }

  private drawBall(ctx: CanvasRenderingContext2D, pose: SkeletonPose, j: SkeletonResult['joints']) {
    if(pose.ball.attachment==='HIDDEN')return
    let center:Vec2
    if(pose.ball.attachment==='LEFT_HAND')center=j.leftHand
    else if(pose.ball.attachment==='RIGHT_HAND')center=j.rightHand
    else if(pose.ball.attachment==='BOTH_HANDS')center=midpoint(j.leftHand,j.rightHand)
    else center={x:0,y:0}
    center={x:center.x+pose.ball.x,y:center.y+pose.ball.y};const angle=pose.ball.rotation*Math.PI/180,scale=pose.ball.scale
    const radius=22*scale,minor=13*scale
    ellipseAt(ctx,center,radius,minor,angle,'#fff9e9','#534737')
    ctx.save();ctx.translate(center.x,center.y);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,radius,minor,0,0,Math.PI*2);ctx.clip();ctx.fillStyle='#246952';ctx.fillRect(-radius*.72,-minor*1.2,4*scale,minor*2.4);ctx.fillStyle='#d6ab45';ctx.fillRect(radius*.48,-minor*1.2,4*scale,minor*2.4);ctx.strokeStyle='#665e4b';ctx.lineWidth=1.5*scale;ctx.beginPath();ctx.moveTo(-8*scale,0);ctx.lineTo(8*scale,0);for(let x=-6;x<=6;x+=4){ctx.moveTo(x*scale,-3*scale);ctx.lineTo(x*scale,3*scale)}ctx.stroke();ctx.restore()
  }

  private drawSkeleton(ctx: CanvasRenderingContext2D, s: SkeletonResult, selected: JointId|null) {
    const j=s.joints;ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle='rgba(237,248,242,.65)'
    const links:[JointId,JointId][]=[['pelvis','neck'],['neck','head'],['leftShoulder','leftElbow'],['leftElbow','leftWrist'],['leftWrist','leftHand'],['rightShoulder','rightElbow'],['rightElbow','rightWrist'],['rightWrist','rightHand'],['leftHip','leftKnee'],['leftKnee','leftAnkle'],['leftAnkle','leftFoot'],['rightHip','rightKnee'],['rightKnee','rightAnkle'],['rightAnkle','rightFoot'],['leftShoulder','rightShoulder'],['leftHip','rightHip']]
    for(const [a,b] of links){ctx.beginPath();ctx.moveTo(j[a].x,j[a].y);ctx.lineTo(j[b].x,j[b].y);ctx.stroke()}
    for(const [id,p] of Object.entries(j) as [JointId,Vec2][]){const isSelected=id===selected;ctx.beginPath();ctx.arc(p.x,p.y,isSelected?8:5,0,Math.PI*2);ctx.fillStyle=isSelected?'#ffcf57':'#eef8f2';ctx.fill();ctx.strokeStyle='#14201c';ctx.lineWidth=2.5;ctx.stroke();if(isSelected){ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.strokeStyle='rgba(255,207,87,.5)';ctx.lineWidth=2;ctx.stroke()}}
    ctx.restore()
  }
}

export function screenToWorld(point: Vec2, width: number, height: number, zoom: number, pan: Vec2): Vec2 {
  return { x: (point.x - width/2 - pan.x) / zoom, y: (point.y - height/2 - 35 - pan.y) / zoom }
}

export function jointToScreen(point: Vec2, width: number, height: number, zoom: number, pan: Vec2): Vec2 {
  return { x: point.x*zoom + width/2 + pan.x, y: point.y*zoom + height/2 + 35 + pan.y }
}
