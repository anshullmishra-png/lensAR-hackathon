/**
 * Pose data only, no logic. The dog is ONE static mesh (no separate tail / ears / head),
 * so a pose is a whole-body change: scale multipliers, pitch and roll, offsets,
 * and an optional idle loop driven by DogController.
 *
 * pitchDeg: + dips the head toward the viewer, - leans it back.
 * rollDeg:  tips the dog onto its side (used for sleeping).
 */
export type LoopKind = "none" | "bob" | "sway" | "shake"

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
}

export const DogPoses: {[name: string]: PoseDef} = {
  relaxed: {scale: [1, 1, 1], pitchDeg: 0, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "sway", loopAmp: 3, loopPeriod: 0.9},
  nervous: {scale: [1, 0.92, 1], pitchDeg: -8, rollDeg: 0, xOffsetCm: 0, yOffsetCm: -1.5, look: true, loop: "shake", loopAmp: 0.5, loopPeriod: 0.16},
  warning: {scale: [1.06, 1.06, 1.06], pitchDeg: 9, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "none", loopAmp: 0, loopPeriod: 1},
  eating: {scale: [1, 0.9, 1.05], pitchDeg: 14, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 3, look: false, loop: "bob", loopAmp: 0.7, loopPeriod: 0.6},
  sleeping: {scale: [1, 1, 1], pitchDeg: 0, rollDeg: 85, xOffsetCm: 30, yOffsetCm: 9, look: false, loop: "bob", loopAmp: 0.4, loopPeriod: 2.8},
  with_puppies: {scale: [1, 1, 1], pitchDeg: -3, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "sway", loopAmp: 2, loopPeriod: 1.4},
  barking: {scale: [1.05, 1.05, 1.05], pitchDeg: 6, rollDeg: 0, xOffsetCm: 0, yOffsetCm: 0, look: true, loop: "bob", loopAmp: 1.6, loopPeriod: 0.34}
}

/** Scene props that can stand next to the dog. */
export const PROP_NAMES: string[] = ["bowl", "puppies", "bark"]

export function hasPose(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(DogPoses, name)
}

export function hasProp(name: string): boolean {
  return PROP_NAMES.indexOf(name) >= 0
}
