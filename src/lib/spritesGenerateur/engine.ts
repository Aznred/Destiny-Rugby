import { BONE_IDS, clone } from './models'
import type {
  AnimationClip, BoneId, BodyProportions, Character, JointId, ProjectData, SkeletonPose, Vec2
} from './models'

export interface RigDimensions {
  torsoLength: number; torsoWidth: number; shoulderWidth: number; neck: number; head: number
  upperArm: number; forearm: number; hand: number; thigh: number; shin: number; foot: number
  armThickness: number; legThickness: number
}

export interface SkeletonResult {
  joints: Record<JointId, Vec2>
  angles: Partial<Record<BoneId, number>>
  baseAngles: Partial<Record<BoneId, number>>
  rig: RigDimensions
}

const rad = (degrees: number) => degrees * Math.PI / 180
const deg = (radians: number) => radians * 180 / Math.PI
const pointAt = (origin: Vec2, angle: number, length: number): Vec2 => ({ x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length })
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (v: Vec2, value: number): Vec2 => ({ x: v.x * value, y: v.y * value })

export function rigFromBody(body: BodyProportions): RigDimensions {
  const h = body.height
  return {
    torsoLength: 80 * body.torsoLength * h,
    torsoWidth: 38 * body.torsoWidth,
    shoulderWidth: 55 * body.shoulderWidth,
    neck: 18 * h,
    head: 48 * body.headScale,
    upperArm: 47 * body.armLength * h,
    forearm: 29 * body.armLength * h,
    hand: 7 * body.armLength,
    thigh: 54 * body.legLength * h,
    shin: 54 * body.legLength * h,
    foot: 28 * body.legLength,
    armThickness: 16 * body.armThickness,
    legThickness: 22 * body.legThickness
  }
}

export function computeSkeleton(character: Character, pose: SkeletonPose): SkeletonResult {
  const rig = rigFromBody(character.appearance.body)
  const p = (id: BoneId) => pose.bones[id]?.rotation || 0
  const rootRotation = pose.root.rotation
  const pelvisAngle = rad(rootRotation + p('pelvis'))
  const root = { x: pose.root.x, y: pose.root.y }
  const pelvis = add(root, { x: pose.pelvis.x, y: pose.pelvis.y })
  const torsoBaseAngle = -90 + rootRotation + p('pelvis') + p('spine')
  const torsoAngle = rad(torsoBaseAngle + p('torso'))
  const torsoTop = pointAt(pelvis, torsoAngle, rig.torsoLength)
  const perpendicular = { x: -Math.sin(torsoAngle), y: Math.cos(torsoAngle) }
  const orientationSwap = pose.orientation === 'back' ? -1 : 1
  const leftShoulder = add(torsoTop, mul(perpendicular, -rig.shoulderWidth / 2 * orientationSwap))
  const rightShoulder = add(torsoTop, mul(perpendicular, rig.shoulderWidth / 2 * orientationSwap))
  const leftHip = add(pelvis, mul(perpendicular, -rig.torsoWidth * .27 * orientationSwap))
  const rightHip = add(pelvis, mul(perpendicular, rig.torsoWidth * .27 * orientationSwap))
  const neck = pointAt(torsoTop, torsoAngle, rig.neck)
  const headAngle = torsoAngle + rad(p('neck') + p('head'))
  const head = pointAt(neck, headAngle, rig.head * .52)
  const torsoLean = deg(torsoAngle) + 90

  const leftUpperBase = 108 + torsoLean
  const leftUpperAngle = rad(leftUpperBase + p('leftUpperArm'))
  const leftElbow = pointAt(leftShoulder, leftUpperAngle, rig.upperArm)
  const leftForearmBase = deg(leftUpperAngle) + p('leftElbow')
  const leftForearmAngle = rad(leftForearmBase + p('leftForearm'))
  const leftWrist = pointAt(leftElbow, leftForearmAngle, rig.forearm)
  const leftHandBase = deg(leftForearmAngle) + p('leftWrist')
  const leftHandAngle = rad(leftHandBase + p('leftHand'))
  const leftHand = pointAt(leftWrist, leftHandAngle, rig.hand)

  const rightUpperBase = 72 + torsoLean
  const rightUpperAngle = rad(rightUpperBase + p('rightUpperArm'))
  const rightElbow = pointAt(rightShoulder, rightUpperAngle, rig.upperArm)
  const rightForearmBase = deg(rightUpperAngle) + p('rightElbow')
  const rightForearmAngle = rad(rightForearmBase + p('rightForearm'))
  const rightWrist = pointAt(rightElbow, rightForearmAngle, rig.forearm)
  const rightHandBase = deg(rightForearmAngle) + p('rightWrist')
  const rightHandAngle = rad(rightHandBase + p('rightHand'))
  const rightHand = pointAt(rightWrist, rightHandAngle, rig.hand)

  const leftThighBase = 94 + deg(pelvisAngle)
  const leftThighAngle = rad(leftThighBase + p('leftThigh'))
  const leftKnee = pointAt(leftHip, leftThighAngle, rig.thigh)
  const leftShinBase = deg(leftThighAngle) + p('leftKnee')
  const leftShinAngle = rad(leftShinBase + p('leftShin'))
  const leftAnkle = pointAt(leftKnee, leftShinAngle, rig.shin)
  const leftFootBase = deg(leftShinAngle) - 72 + p('leftAnkle')
  const leftFootAngle = rad(leftFootBase + p('leftFoot'))
  const leftFoot = pointAt(leftAnkle, leftFootAngle, rig.foot)

  const rightThighBase = 86 + deg(pelvisAngle)
  const rightThighAngle = rad(rightThighBase + p('rightThigh'))
  const rightKnee = pointAt(rightHip, rightThighAngle, rig.thigh)
  const rightShinBase = deg(rightThighAngle) + p('rightKnee')
  const rightShinAngle = rad(rightShinBase + p('rightShin'))
  const rightAnkle = pointAt(rightKnee, rightShinAngle, rig.shin)
  const rightFootBase = deg(rightShinAngle) - 72 + p('rightAnkle')
  const rightFootAngle = rad(rightFootBase + p('rightFoot'))
  const rightFoot = pointAt(rightAnkle, rightFootAngle, rig.foot)

  return {
    rig,
    joints: { root, pelvis, spine: pointAt(pelvis, torsoAngle, rig.torsoLength * .45), neck, head, leftShoulder, leftElbow, leftWrist, leftHand, rightShoulder, rightElbow, rightWrist, rightHand, leftHip, leftKnee, leftAnkle, leftFoot, rightHip, rightKnee, rightAnkle, rightFoot },
    angles: { pelvis: pelvisAngle, torso: torsoAngle, head: headAngle, leftUpperArm: leftUpperAngle, leftForearm: leftForearmAngle, leftHand: leftHandAngle, rightUpperArm: rightUpperAngle, rightForearm: rightForearmAngle, rightHand: rightHandAngle, leftThigh: leftThighAngle, leftShin: leftShinAngle, leftFoot: leftFootAngle, rightThigh: rightThighAngle, rightShin: rightShinAngle, rightFoot: rightFootAngle },
    baseAngles: { pelvis: rad(rootRotation), torso: rad(torsoBaseAngle), head: torsoAngle + rad(p('neck')), leftUpperArm: rad(leftUpperBase), leftForearm: rad(leftForearmBase), leftHand: rad(leftHandBase), rightUpperArm: rad(rightUpperBase), rightForearm: rad(rightForearmBase), rightHand: rad(rightHandBase), leftThigh: rad(leftThighBase), leftShin: rad(leftShinBase), leftFoot: rad(leftFootBase), rightThigh: rad(rightThighBase), rightShin: rad(rightShinBase), rightFoot: rad(rightFootBase) }
  }
}

export function normalizeAngle(value: number): number {
  let result = ((value + 180) % 360 + 360) % 360 - 180
  if (result === -180) result = 180
  return result
}

export function shortestAngle(from: number, to: number): number {
  return normalizeAngle(to - from)
}

export function clampBoneRotation(id: BoneId, value: number, enabled: boolean): number {
  const v = normalizeAngle(value)
  if (!enabled) return v
  const ranges: Partial<Record<BoneId, [number, number]>> = {
    leftShin: [-150, 150], rightShin: [-150, 150], leftForearm: [-160, 160], rightForearm: [-160, 160],
    leftFoot: [-60, 60], rightFoot: [-60, 60], leftThigh: [-120, 120], rightThigh: [-120, 120],
    leftUpperArm: [-170, 170], rightUpperArm: [-170, 170], head: [-55, 55], torso: [-65, 65], pelvis: [-60, 60]
  }
  const range = ranges[id]
  return range ? Math.max(range[0], Math.min(range[1], v)) : v
}

export function localRotationFromPointer(bone: BoneId, pivot: Vec2, pointer: Vec2, skeleton: SkeletonResult): number {
  const desired = Math.atan2(pointer.y - pivot.y, pointer.x - pivot.x)
  const base = skeleton.baseAngles[bone] ?? 0
  return normalizeAngle(deg(desired - base))
}

export function solveTwoBone(origin: Vec2, target: Vec2, firstLength: number, secondLength: number, bend: 1 | -1): [number, number] {
  const dx = target.x - origin.x, dy = target.y - origin.y
  const rawDistance = Math.hypot(dx, dy)
  const distance = Math.max(Math.abs(firstLength - secondLength) + .001, Math.min(firstLength + secondLength - .001, rawDistance))
  const targetAngle = Math.atan2(dy, dx)
  const cosine = Math.max(-1, Math.min(1, (firstLength ** 2 + distance ** 2 - secondLength ** 2) / (2 * firstLength * distance)))
  const offset = Math.acos(cosine) * bend
  const firstAngle = targetAngle - offset
  const elbow = pointAt(origin, firstAngle, firstLength)
  const secondAngle = Math.atan2(target.y - elbow.y, target.x - elbow.x)
  return [firstAngle, secondAngle]
}

export function interpolatePose(a: SkeletonPose, b: SkeletonPose, amount: number, smooth = false): SkeletonPose {
  if(amount<=0)return clone(a)
  if(amount>=1)return clone(b)
  const t = smooth ? amount * amount * (3 - 2 * amount) : amount
  const result = clone(a)
  const lerp = (from: number, to: number) => from + (to - from) * t
  const lerpAngle = (from: number, to: number) => from + shortestAngle(from, to) * t
  result.root = { x: lerp(a.root.x, b.root.x), y: lerp(a.root.y, b.root.y), rotation: lerpAngle(a.root.rotation, b.root.rotation) }
  result.pelvis = { x: lerp(a.pelvis.x, b.pelvis.x), y: lerp(a.pelvis.y, b.pelvis.y) }
  for (const id of BONE_IDS) result.bones[id].rotation = lerpAngle(a.bones[id].rotation, b.bones[id].rotation)
  result.ball = { ...a.ball, x: lerp(a.ball.x, b.ball.x), y: lerp(a.ball.y, b.ball.y), rotation: lerp(a.ball.rotation, b.ball.rotation), scale: lerp(a.ball.scale, b.ball.scale), attachment: t < .5 ? a.ball.attachment : b.ball.attachment }
  result.refereeCard=t<.5?a.refereeCard:b.refereeCard
  result.refereeCardHand=t<.5?a.refereeCardHand:b.refereeCardHand
  result.orientation = t < .5 ? a.orientation : b.orientation
  return result
}

export function poseAtTime(clip: AnimationClip, framePosition: number): SkeletonPose {
  if (clip.frames.length === 1) return clone(clip.frames[0].pose)
  const position=clip.loop?((framePosition%clip.frames.length)+clip.frames.length)%clip.frames.length:Math.max(0,Math.min(framePosition,clip.frames.length-1))
  const baseIndex = Math.floor(position)
  const nextIndex = clip.loop?(baseIndex+1)%clip.frames.length:Math.min(baseIndex+1,clip.frames.length-1)
  if (clip.interpolation === 'STEP') return clone(clip.frames[baseIndex].pose)
  return interpolatePose(clip.frames[baseIndex].pose, clip.frames[nextIndex].pose, position-baseIndex, clip.interpolation === 'SMOOTH')
}

const pairs: [BoneId, BoneId][] = [
  ['leftShoulder','rightShoulder'],['leftUpperArm','rightUpperArm'],['leftElbow','rightElbow'],['leftForearm','rightForearm'],['leftWrist','rightWrist'],['leftHand','rightHand'],
  ['leftHip','rightHip'],['leftThigh','rightThigh'],['leftKnee','rightKnee'],['leftShin','rightShin'],['leftAnkle','rightAnkle'],['leftFoot','rightFoot']
]

export function mirrorPose(source: SkeletonPose): SkeletonPose {
  const result = clone(source)
  for (const [left, right] of pairs) {
    result.bones[left].rotation = -source.bones[right].rotation
    result.bones[right].rotation = -source.bones[left].rotation
  }
  for (const id of ['pelvis','spine','torso','neck','head'] as BoneId[]) result.bones[id].rotation = -source.bones[id].rotation
  result.root.x = -source.root.x; result.root.rotation = -source.root.rotation; result.pelvis.x = -source.pelvis.x; result.ball.x = -source.ball.x; result.ball.rotation = -source.ball.rotation
  if (source.ball.attachment === 'LEFT_HAND') result.ball.attachment = 'RIGHT_HAND'; else if (source.ball.attachment === 'RIGHT_HAND') result.ball.attachment = 'LEFT_HAND'
  if(source.refereeCard)result.refereeCardHand=source.refereeCardHand==='left'?'right':'left'
  if (source.orientation === 'left') result.orientation = 'right'; else if (source.orientation === 'right') result.orientation = 'left'
  return result
}

export class HistoryManager<T> {
  private undoStack: T[] = []
  private redoStack: T[] = []
  private limit: number
  constructor(limit = 80) { this.limit = limit }
  push(value: T) { this.undoStack.push(clone(value)); if (this.undoStack.length > this.limit) this.undoStack.shift(); this.redoStack = [] }
  undo(current: T): T | null { const value = this.undoStack.pop(); if (!value) return null; this.redoStack.push(clone(current)); return clone(value) }
  redo(current: T): T | null { const value = this.redoStack.pop(); if (!value) return null; this.undoStack.push(clone(current)); return clone(value) }
  get canUndo() { return this.undoStack.length > 0 }
  get canRedo() { return this.redoStack.length > 0 }
}

const STORAGE_KEY = 'ruck-lab-project-v1'
export function loadProject(): ProjectData | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as ProjectData : null } catch { return null }
}
export function saveProject(project: ProjectData): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)) } catch { /* storage can be unavailable */ } }

export function validateProject(project: ProjectData): boolean {
  return project?.version === 1 && Array.isArray(project.characters) && project.characters.length > 0 && Array.isArray(project.animations) && project.animations.every(c => Array.isArray(c.frames) && c.frames.length > 0)
}
