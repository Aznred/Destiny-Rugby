export type BoneId =
  | 'pelvis' | 'spine' | 'torso' | 'neck' | 'head'
  | 'leftShoulder' | 'leftUpperArm' | 'leftElbow' | 'leftForearm' | 'leftWrist' | 'leftHand'
  | 'rightShoulder' | 'rightUpperArm' | 'rightElbow' | 'rightForearm' | 'rightWrist' | 'rightHand'
  | 'leftHip' | 'leftThigh' | 'leftKnee' | 'leftShin' | 'leftAnkle' | 'leftFoot'
  | 'rightHip' | 'rightThigh' | 'rightKnee' | 'rightShin' | 'rightAnkle' | 'rightFoot'

export type JointId =
  | 'root' | 'pelvis' | 'spine' | 'neck' | 'head'
  | 'leftShoulder' | 'leftElbow' | 'leftWrist' | 'leftHand'
  | 'rightShoulder' | 'rightElbow' | 'rightWrist' | 'rightHand'
  | 'leftHip' | 'leftKnee' | 'leftAnkle' | 'leftFoot'
  | 'rightHip' | 'rightKnee' | 'rightAnkle' | 'rightFoot'

export type Orientation = 'front' | 'back' | 'left' | 'right'
export type InterpolationMode = 'STEP' | 'LINEAR' | 'SMOOTH'
export type BallAttachment = 'HIDDEN' | 'FREE' | 'LEFT_HAND' | 'RIGHT_HAND' | 'BOTH_HANDS'
export type KitPattern = 'SOLID' | 'HOOPS' | 'HORIZONTAL_STRIPES' | 'VERTICAL_STRIPES' | 'SHOULDERS' | 'SLEEVES' | 'CHEST_STRIPE' | 'DIAGONAL'
export type HairStyle = 'bald' | 'buzz' | 'short' | 'fade' | 'curly' | 'afro' | 'mullet' | 'mohawk' | 'messy' | 'long' | 'dreadlocks'
export type FacialHair = 'none' | 'moustache' | 'goatee' | 'short_beard' | 'full_beard'
export type BodyType = 'prop' | 'forward' | 'athletic' | 'back' | 'winger'

export interface Vec2 { x: number; y: number }
export interface RootTransform extends Vec2 { rotation: number }
export interface BoneTransform { rotation: number; localX?: number; localY?: number; scaleX?: number; scaleY?: number }
export interface BallPose { attachment: BallAttachment; x: number; y: number; rotation: number; scale: number }

export interface SkeletonPose {
  refereeCard?: 'yellow' | 'red'
  refereeCardHand?: 'left' | 'right'
  root: RootTransform
  pelvis: Vec2
  bones: Record<BoneId, BoneTransform>
  orientation: Orientation
  ball: BallPose
}

export interface AnimationFrame {
  id: string
  frame: number
  keyframe: boolean
  pose: SkeletonPose
}

export interface AnimationClip {
  category?: string
  description?: string
  id: string
  name: string
  fps: number
  loop: boolean
  rootMotion: boolean
  interpolation: InterpolationMode
  frames: AnimationFrame[]
}

export interface BodyProportions {
  height: number
  torsoLength: number
  torsoWidth: number
  shoulderWidth: number
  armLength: number
  armThickness: number
  legLength: number
  legThickness: number
  headScale: number
}

export interface CharacterAppearance {
  skin: string
  bodyType: BodyType
  hair: { style: HairStyle; color: string }
  facialHair: { style: FacialHair; color: string }
  body: BodyProportions
  kit: {
    primary: string
    secondary: string
    accent: string
    pattern: KitPattern
    shorts: string
    socks: string
    boots: string
  }
  number: number
}

export interface Character {
  id: string
  name: string
  position: string
  appearance: CharacterAppearance
}

export interface EditorSettings {
  showSkeleton: boolean
  ikEnabled: boolean
  jointLimits: boolean
  onionSkin: boolean
  onionRange: 1 | 2
  previousOpacity: number
  nextOpacity: number
  kneeBend: { left: 1 | -1; right: 1 | -1 }
  zoom: number
  pan: Vec2
}

export interface ProjectData {
  rugbyLibraryVersion?: number
  version: 1
  name: string
  characters: Character[]
  animations: AnimationClip[]
  currentCharacterId: string
  currentAnimationId: string
  currentFrameIndex: number
  settings: EditorSettings
}

export const BONE_IDS: BoneId[] = [
  'pelvis','spine','torso','neck','head',
  'leftShoulder','leftUpperArm','leftElbow','leftForearm','leftWrist','leftHand',
  'rightShoulder','rightUpperArm','rightElbow','rightForearm','rightWrist','rightHand',
  'leftHip','leftThigh','leftKnee','leftShin','leftAnkle','leftFoot',
  'rightHip','rightThigh','rightKnee','rightShin','rightAnkle','rightFoot'
]

export const BONE_LABELS: Record<BoneId, string> = {
  pelvis:'Bassin',spine:'Colonne',torso:'Torse',neck:'Cou',head:'Tête',
  leftShoulder:'Épaule gauche',leftUpperArm:'Bras gauche',leftElbow:'Coude gauche',leftForearm:'Avant-bras gauche',leftWrist:'Poignet gauche',leftHand:'Main gauche',
  rightShoulder:'Épaule droite',rightUpperArm:'Bras droit',rightElbow:'Coude droit',rightForearm:'Avant-bras droit',rightWrist:'Poignet droit',rightHand:'Main droite',
  leftHip:'Hanche gauche',leftThigh:'Cuisse gauche',leftKnee:'Genou gauche',leftShin:'Tibia gauche',leftAnkle:'Cheville gauche',leftFoot:'Pied gauche',
  rightHip:'Hanche droite',rightThigh:'Cuisse droite',rightKnee:'Genou droit',rightShin:'Tibia droit',rightAnkle:'Cheville droite',rightFoot:'Pied droit'
}

export const JOINT_TO_BONE: Record<JointId, BoneId> = {
  root:'pelvis',pelvis:'pelvis',spine:'spine',neck:'neck',head:'head',
  leftShoulder:'leftUpperArm',leftElbow:'leftForearm',leftWrist:'leftHand',leftHand:'leftHand',
  rightShoulder:'rightUpperArm',rightElbow:'rightForearm',rightWrist:'rightHand',rightHand:'rightHand',
  leftHip:'leftThigh',leftKnee:'leftShin',leftAnkle:'leftFoot',leftFoot:'leftFoot',
  rightHip:'rightThigh',rightKnee:'rightShin',rightAnkle:'rightFoot',rightFoot:'rightFoot'
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function clone<T>(value: T): T {
  return structuredClone(value)
}

export function createRestPose(): SkeletonPose {
  const bones = {} as Record<BoneId, BoneTransform>
  for (const id of BONE_IDS) bones[id] = { rotation: 0, scaleX: 1, scaleY: 1 }
  return {
    root: { x: 0, y: 0, rotation: 0 },
    pelvis: { x: 0, y: 0 },
    bones,
    orientation: 'front',
    ball: { attachment: 'HIDDEN', x: 0, y: 0, rotation: -18, scale: 1 }
  }
}

export function createFrame(pose = createRestPose(), frame = 0): AnimationFrame {
  return { id: uid('frame'), frame, keyframe: true, pose: clone(pose) }
}
