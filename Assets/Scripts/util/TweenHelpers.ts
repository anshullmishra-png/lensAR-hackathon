import {ch} from "Motion.lspkg/Channels"
import {power2} from "Motion.lspkg/Eases"
import {Motion} from "Motion.lspkg/Motion"

const DEG = Math.PI / 180

export type Done = () => void

/**
 * The ONLY file that touches the tween library (Motion, installed with UI Kit; the prompt
 * said LSTween, which is not in the Asset Library). Swapping libraries means editing this file.
 *
 * Note: no fadeIn/fadeOut. Motion's alpha channel needs an {opacity} target or a registered
 * alpha writer; plain Text/BackPlate have neither, so panels pop with scale instead.
 */
export const TweenHelpers = {
  scaleTo(node: SceneObject, scale: vec3, seconds: number, onDone?: Done): void {
    Motion.to(node, {
      channel: ch.scale,
      value: scale,
      duration: seconds,
      ease: power2.out,
      onFinish: onDone ? () => onDone() : undefined
    })
  },

  /** Pop a panel in from nearly nothing to `target`. */
  scaleIn(node: SceneObject, target: vec3, seconds: number = 0.25): void {
    node.getTransform().setLocalScale(target.uniformScale(0.01))
    TweenHelpers.scaleTo(node, target, seconds)
  },

  /** Shrink to nearly nothing, then call onDone (use it to disable the object). */
  scaleOut(node: SceneObject, seconds: number = 0.2, onDone?: Done): void {
    TweenHelpers.scaleTo(node, node.getTransform().getLocalScale().uniformScale(0.01), seconds, onDone)
  },

  moveTo(node: SceneObject, position: vec3, seconds: number, onDone?: Done): void {
    Motion.to(node, {
      channel: ch.position,
      value: position,
      duration: seconds,
      ease: power2.out,
      onFinish: onDone ? () => onDone() : undefined
    })
  },

  /** Euler degrees (x, y, z). */
  rotateTo(node: SceneObject, eulerDeg: vec3, seconds: number, onDone?: Done): void {
    Motion.to(node, {
      channel: ch.rotation,
      value: quat.fromEulerAngles(eulerDeg.x * DEG, eulerDeg.y * DEG, eulerDeg.z * DEG),
      duration: seconds,
      ease: power2.out,
      onFinish: onDone ? () => onDone() : undefined
    })
  },

  /** Endless back-and-forth roll about Z, degrees. */
  loopRotateZ(node: SceneObject, fromDeg: number, toDeg: number, seconds: number): void {
    Motion.fromTo(node, {
      channel: ch.rotationZ,
      from: fromDeg,
      value: toDeg,
      duration: seconds,
      repeat: -1,
      yoyo: true
    })
  },

  stop(node: SceneObject): void {
    Motion.killTweensOf(node)
  }
}
