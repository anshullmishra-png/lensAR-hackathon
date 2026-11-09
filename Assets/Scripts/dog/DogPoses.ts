/**
 * Pose data only, no logic. A pose has two parts: a whole-body change (scale multipliers, pitch and roll, offsets and an
 * optional idle loop driven by DogController) and `rig`, the part-level body language (ears, tail, jaw, eyes, fur) that
 * DogRealistic (or the fallback DogRig) turns into bone and attachment movement.
 *
 * pitchDeg: + dips the head toward the viewer, - leans it back.
 * rollDeg:  tips the dog onto its side (used for sleeping).
 */
export type LoopKind = "none" | "bob" | "sway" | "shake"

/**
 * Part-level body language for the articulated dog (see DogRig). All numbers, so DogRig can blend smoothly
 * from one pose to the next.
 */
export interface RigPose {
  /** 0 = ears relaxed .. 1 = pinned flat back. */
  earBack: number
  /** 0 = relaxed .. 1 = pricked forward and alert. */
  earForward: number
  /** Tail angle at the base, degrees: + raises it, - drops it between the legs. */
  tailPitch: number
  /** Extra bend per tail segment, degrees: - curls the tail down and forward (tucked). */
  tailCurl: number
  /** Side-to-side wag, degrees, and how fast (cycles per second). 0 = held still. */
  wagAmp: number
  wagHz: number
  /** 0 = mouth closed .. 1 = wide open. */
  jaw: number
  /** 0 = no tongue .. 1 = tongue out (panting). */
  tongue: number
  /** 0..1: lip curled so the teeth show. */
  teeth: number
  /** Vertical size of the eyes: 1 normal, below 1 soft or sleepy, 0.05 closed, above 1 wide and staring. */
  eye: number
  /** 0..1: white ring round the eyes ("whale eye"), a sign of unease. */
  eyeRing: number
  /** 0 = fur flat .. 1 = ridge of fur raised along the spine. */
  hackles: number
  /** Head tilt in degrees: + lowers the head. */
  headPitch: number
  /** 0..1: how much he licks his lips now and then. */
  lick: number
  /** 0..1: how much he yawns now and then. */
  yawn: number
  /** 0..1: barking, the jaw snaps open and shut. */
  bark: number
}

const CALM: RigPose = {
  earBack: 0, earForward: 0, tailPitch: 30, tailCurl: 6, wagAmp: 0, wagHz: 0, jaw: 0, tongue: 0, teeth: 0,
  eye: 1, eyeRing: 0, hackles: 0, headPitch: 0, lick: 0, yawn: 0, bark: 0
}
const rp = (over: Partial<RigPose>): RigPose => ({...CALM, ...over})

export interface PoseDef {
  /** Multipliers on the dog's base scale (x, y, z). */
  scale: [number, number, number]
  pitchDeg: number
  rollDeg: number
  /** Sideways shift in cm. Rolling about the feet slides the body sideways; this puts it back in the middle. */
  xOffsetCm: number
  /** Extra height in cm (negative = lower, positive = lift so a tilted body does not sink into the floor). */
  yOffsetCm: number
  /** Whether the dog turns to watch the user in this pose (off while asleep or eating). */
  look: boolean
  loop: LoopKind
  /** Loop size: cm for bob/shake, degrees for sway. */
  loopAmp: number
  /** Seconds per loop cycle. */
  loopPeriod: number
  /** What his ears, tail, mouth, eyes and fur are doing. */
  rig: RigPose
}

export const DogPoses: {[name: string]: PoseDef} = {
  relaxed: {scale: [1, 1, 1], pitchDeg: 0, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "sway", loopAmp: 3, loopPeriod: 0.9, rig: rp({earBack: 0.1, tailPitch: 35, tailCurl: 6, wagAmp: 30, wagHz: 1.7, jaw: 0.18, tongue: 0.9, eye: 0.62})},
  nervous: {scale: [1, 0.92, 1], pitchDeg: -8, rollDeg: 0, xOffsetCm: 0, yOffsetCm: -1.5, look: true, loop: "shake", loopAmp: 0.5, loopPeriod: 0.16, rig: rp({earBack: 1, tailPitch: -78, tailCurl: -16, eye: 1.1, eyeRing: 1, headPitch: 14, lick: 1, yawn: 1})},
  warning: {scale: [1.06, 1.06, 1.06], pitchDeg: 9, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "none", loopAmp: 0, loopPeriod: 1, rig: rp({earForward: 0.85, tailPitch: 64, tailCurl: 3, wagAmp: 4, wagHz: 0.7, jaw: 0.3, teeth: 1, eye: 0.62, hackles: 1, headPitch: 9})},
  eating: {scale: [1, 0.9, 1.05], pitchDeg: 14, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 3, look: false, loop: "bob", loopAmp: 0.7, loopPeriod: 0.6, rig: rp({earBack: 0.2, tailPitch: 28, tailCurl: 5, wagAmp: 14, wagHz: 1.2, eye: 0.8, headPitch: 38})},
  sleeping: {scale: [1, 1, 1], pitchDeg: 0, rollDeg: 85, xOffsetCm: 30, yOffsetCm: 9, look: false, loop: "bob", loopAmp: 0.4, loopPeriod: 2.8, rig: rp({earBack: 0.35, tailPitch: 4, tailCurl: -4, eye: 0.05, headPitch: 10})},
  with_puppies: {scale: [1, 1, 1], pitchDeg: -3, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "sway", loopAmp: 2, loopPeriod: 1.4, rig: rp({earBack: 0.05, tailPitch: 38, tailCurl: 6, wagAmp: 22, wagHz: 1.4, jaw: 0.14, tongue: 0.5, eye: 0.75})},
  barking: {scale: [1.05, 1.05, 1.05], pitchDeg: 6, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "bob", loopAmp: 1.6, loopPeriod: 0.34, rig: rp({earForward: 0.7, tailPitch: 56, tailCurl: 3, wagAmp: 5, wagHz: 0.9, eye: 1.15, bark: 1, headPitch: 4})}
}

/** Scene props that can stand next to the dog. */
export const PROP_NAMES: string[] = ["bowl", "puppies", "bark"]

export function hasPose(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(DogPoses, name)
}

export function hasProp(name: string): boolean {
  return PROP_NAMES.indexOf(name) >= 0
}
