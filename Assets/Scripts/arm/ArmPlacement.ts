import {Config} from "../app/Config"
import {bus} from "../core/EventBus"
import {Events} from "../core/Events"
import {Log} from "../util/Log"
import {TweenHelpers} from "../util/TweenHelpers"

/**
 * Shows the forearm on an imaginary table in front of the user, to the left (the panels are on
 * the right) and below eye level, with a short scale-in. Hidden the rest of the time.
 */
@component
export class ArmPlacement extends BaseScriptComponent {
  @input
  @hint("The Camera Object")
  cameraObject: SceneObject

  onAwake(): void {
    bus.on(Events.ARM_SHOW, () => this.show())
    bus.on(Events.ARM_HIDE, () => this.hide())
    // Hide after every script has woken up (children build their parts in their own onAwake),
    // unless a level already asked for the arm: AppRoot can start a level before this runs.
    this.createEvent("OnStartEvent").bind(() => {
      if (!this.requested) {
        this.sceneObject.enabled = false
      }
    })
  }

  private requested = false

  show(): void {
    if (!this.cameraObject) {
      Log.error("ArmPlacement: cameraObject is not assigned")
      return
    }
    this.requested = true
    this.place()
    this.sceneObject.enabled = true
    TweenHelpers.scaleIn(this.sceneObject, vec3.one().uniformScale(Config.ARM_SCALE), 0.4)
  }

  hide(): void {
    if (!this.sceneObject.enabled) {
      return
    }
    TweenHelpers.scaleOut(this.sceneObject, 0.25, () => {
      this.sceneObject.enabled = false
    })
  }

  private place(): void {
    const camT = this.cameraObject.getTransform()
    const cam = camT.getWorldPosition()
    const look = camT.back
    const right = camT.right
    let fwd = new vec3(look.x, 0, look.z)
    fwd = fwd.length < 0.001 ? new vec3(0, 0, -1) : fwd.normalize()
    let side = new vec3(right.x, 0, right.z)
    side = side.length < 0.001 ? new vec3(1, 0, 0) : side.normalize()

    const pos = new vec3(
      cam.x + fwd.x * Config.ARM_DISTANCE + side.x * Config.ARM_SIDE,
      cam.y - Config.ARM_DROP,
      cam.z + fwd.z * Config.ARM_DISTANCE + side.z * Config.ARM_SIDE
    )
    const t = this.sceneObject.getTransform()
    t.setWorldPosition(pos)
    // The arm lies along its local X, so turning its front (+Z) to the user shows it side-on.
    const yaw = Math.atan2(cam.x - pos.x, cam.z - pos.z)
    t.setWorldRotation(quat.fromEulerAngles(0, yaw, 0))
  }
}
