import {Config} from "../app/Config"
import {Log} from "../util/Log"

/**
 * Parent of every UI panel. Floats UI_DISTANCE in front of the user, UI_SIDE_OFFSET to the
 * right, at eye level, and follows loosely (it eases toward the target; it is never locked to the head).
 */
@component
export class UiAnchor extends BaseScriptComponent {
  @input
  @hint("The Camera Object")
  cameraObject: SceneObject

  @input
  @hint("Higher = follows faster. Low values feel 'lazy'.")
  followSpeed: number = 1.5

  private ready = false

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.tick())
  }

  /** Jump straight to the target (used once at start). */
  snap(): void {
    if (!this.cameraObject) {
      Log.error("UiAnchor: cameraObject is not assigned")
      return
    }
    this.sceneObject.getTransform().setWorldPosition(this.target())
    this.faceCamera()
    this.ready = true
  }

  private target(): vec3 {
    const camT = this.cameraObject.getTransform()
    const cam = camT.getWorldPosition()
    const look = camT.back
    const right = camT.right
    let fwd = new vec3(look.x, 0, look.z)
    fwd = fwd.length < 0.001 ? new vec3(0, 0, -1) : fwd.normalize()
    let side = new vec3(right.x, 0, right.z)
    side = side.length < 0.001 ? new vec3(1, 0, 0) : side.normalize()
    return new vec3(
      cam.x + fwd.x * Config.UI_DISTANCE + side.x * Config.UI_SIDE_OFFSET,
      cam.y - Config.UI_EYE_DROP,
      cam.z + fwd.z * Config.UI_DISTANCE + side.z * Config.UI_SIDE_OFFSET
    )
  }

  private faceCamera(): void {
    const cam = this.cameraObject.getTransform().getWorldPosition()
    const me = this.sceneObject.getTransform().getWorldPosition()
    const yaw = Math.atan2(cam.x - me.x, cam.z - me.z)
    this.sceneObject.getTransform().setWorldRotation(quat.fromEulerAngles(0, yaw, 0))
  }

  private tick(): void {
    if (!this.ready || !this.cameraObject) {
      return
    }
    const t = this.sceneObject.getTransform()
    const k = Math.min(1, this.followSpeed * getDeltaTime())
    t.setWorldPosition(vec3.lerp(t.getWorldPosition(), this.target(), k))
    this.faceCamera()
  }
}
